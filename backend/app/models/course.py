from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text)
    price = Column(Float, default=0.0)
    thumbnail_url = Column(String)
    
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    instructor = relationship("User", backref="courses_taught")

    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    order = Column(Integer, default=0)
    
    course_id = Column(Integer, ForeignKey("courses.id"))
    course = relationship("Course", back_populates="modules")

    lessons = relationship("Lesson", back_populates="module", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    video_url = Column(String)
    content = Column(Text)
    order = Column(Integer, default=0)
    
    module_id = Column(Integer, ForeignKey("modules.id"))
    module = relationship("Module", back_populates="lessons")
